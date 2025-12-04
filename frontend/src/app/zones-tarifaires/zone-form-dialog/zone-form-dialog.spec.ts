import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZoneFormDialog } from './zone-form-dialog';

describe('ZoneFormDialog', () => {
  let component: ZoneFormDialog;
  let fixture: ComponentFixture<ZoneFormDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZoneFormDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ZoneFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
