import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VuesPubliques } from './vues-publiques';

describe('VuesPubliques', () => {
  let component: VuesPubliques;
  let fixture: ComponentFixture<VuesPubliques>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VuesPubliques]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VuesPubliques);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
