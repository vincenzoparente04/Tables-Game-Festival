import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditeurList } from './editeur-list';

describe('EditeurList', () => {
  let component: EditeurList;
  let fixture: ComponentFixture<EditeurList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditeurList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditeurList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
